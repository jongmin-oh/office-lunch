import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTodo, deleteTodo, listTodos, updateTodo } from "./api";
import type { Todo } from "./api";

const todosKey = ["todos"];

function useOptimisticTodos<V>(
  mutationFn: (variables: V) => Promise<unknown>,
  apply: (todos: Todo[], variables: V) => Todo[],
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async (variables: V) => {
      await client.cancelQueries({ queryKey: todosKey });
      const previous = client.getQueryData<Todo[]>(todosKey);
      client.setQueryData<Todo[]>(
        todosKey,
        (old) => old && apply(old, variables),
      );
      return { previous };
    },
    onError: (_error, _variables, context) =>
      client.setQueryData(todosKey, context?.previous),
    onSettled: () => client.invalidateQueries({ queryKey: todosKey }),
  });
}

export function useTodos() {
  const client = useQueryClient();
  const { data: todos, isPending } = useQuery({
    queryKey: todosKey,
    queryFn: listTodos,
  });
  const add = useMutation({
    mutationFn: createTodo,
    onSettled: () => client.invalidateQueries({ queryKey: todosKey }),
  });
  const toggle = useOptimisticTodos(
    ({ id, done }: { id: string; done: boolean }) => updateTodo(id, { done }),
    (list, { id, done }) => list.map((t) => (t.id === id ? { ...t, done } : t)),
  );
  const remove = useOptimisticTodos(deleteTodo, (list, id: string) =>
    list.filter((t) => t.id !== id),
  );
  return { todos, isPending, add, toggle, remove };
}
